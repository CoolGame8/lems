import React, { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { WithId } from 'mongodb';
import { Socket } from 'socket.io-client';
import { Form, Formik, FormikValues } from 'formik';
import { Typography, Button, Alert, Stack, SxProps, Theme, Paper, Box } from '@mui/material';
import { purple } from '@mui/material/colors';
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {
  Event,
  Team,
  WSServerEmittedEvents,
  WSClientEmittedEvents,
  SafeUser,
  Scoresheet,
  MissionClause
} from '@lems/types';
import { fullMatch } from '@lems/utils';
import {
  SEASON_SCORESHEET,
  ALLOW_SCORESHEET_DEFAULTS,
  ScoresheetError,
  localizedScoresheet
} from '@lems/season';
import { enqueueSnackbar } from 'notistack';
import ScoresheetMission from './scoresheet-mission';
import GpSelector from './gp';

interface Props {
  event: WithId<Event>;
  team: WithId<Team>;
  scoresheet: WithId<Scoresheet>;
  user: WithId<SafeUser>;
  socket: Socket<WSServerEmittedEvents, WSClientEmittedEvents>;
}

const ScoresheetForm: React.FC<Props> = ({ event, team, scoresheet, user, socket }) => {
  const router = useRouter();
  const isEditable = true;
  const [missionErrors, setMissionErrors] = useState<
    Array<{ id: string; description: string } | undefined>
  >([]);
  const [mode, setMode] = useState<'scoring' | 'gp'>('scoring');
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const getDefaultScoresheet = () => {
    const missions = SEASON_SCORESHEET.missions.map(m => {
      return {
        id: m.id,
        clauses: m.clauses.map(c => {
          return { type: c.type, value: ALLOW_SCORESHEET_DEFAULTS ? c.default : null };
        })
      };
    });
    return { missions: missions, signature: '', gp: null, score: 0 };
  };

  const calculateScore = (values: FormikValues) => {
    let score = 0;
    const currentErrors: Array<{ id: string; description: string } | undefined> = [];

    SEASON_SCORESHEET.missions.forEach((mission, missionIndex) => {
      const clauses = values.missions[missionIndex].clauses;
      try {
        score += mission.calculation(...clauses.map((clause: MissionClause) => clause.value));
      } catch (error: any) {
        if (error instanceof ScoresheetError) {
          const localizedErrors = localizedScoresheet.missions[missionIndex].errors;
          if (localizedErrors && localizedErrors.length > 0)
            currentErrors.push(localizedErrors.find(e => e.id === error.id));
        }
      }
    });
    return { score, currentErrors };
  };

  const handleSync = async (
    showSnackbar: boolean,
    formValues: FormikValues | undefined,
    newstatus: string | undefined
  ) => {
    const updatedScoresheet = {} as any;
    if (newstatus) updatedScoresheet['status'] = newstatus;
    if (formValues) updatedScoresheet['data'] = formValues;

    socket.emit(
      'updateScoresheet',
      event._id.toString(),
      team._id.toString(),
      scoresheet._id.toString(),
      updatedScoresheet as Partial<Scoresheet>,
      response => {
        if (response.ok) {
          if (showSnackbar) {
            enqueueSnackbar('דף הניקוד נשמר בהצלחה.', { variant: 'success' });
          }
        } else {
          enqueueSnackbar('אופס, שמירת דף הניקוד נכשלה.', { variant: 'error' });
        }
      }
    );
  };

  const validateScoresheet = (formValues: FormikValues) => {
    const errors: any = {};

    const { score, currentErrors } = calculateScore(formValues);
    setMissionErrors(currentErrors);

    //set errors to include all mission errors

    // Error if a clause has value null (each null = 1 error)
    // missions.clauses have no clause with .value === null
    // signature is length > 0 error if this happens

    if (isEditable) {
      const isCompleted = Object.keys(errors).length === 0;
      const isEmpty = Object.values(formValues).filter(x => !!x).length === 0; //TODO: make this scan for nulls and then not complete if there are nulls
      // Is empty (update)
      // missions.clauses have all clauses with .value === null

      // TODO: scoresheet status for waiting for head ref
      let newStatus = undefined;
      if (isEmpty) {
        newStatus = 'empty';
      } else if (!isCompleted) {
        newStatus = 'in-progress';
      } else if (isCompleted && ['empty', 'in-progress', 'completed'].includes(scoresheet.status)) {
        newStatus = 'completed';
      }

      formValues.score = score;

      if (!fullMatch(scoresheet.data, formValues) || scoresheet.status !== newStatus) {
        handleSync(false, formValues, newStatus);
      }

      return errors;
    }
  };

  return (
    <>
      <Formik
        initialValues={scoresheet.data || getDefaultScoresheet()}
        validate={validateScoresheet}
        onSubmit={(values, actions) => {
          // TODO: This should return to the referee page
          actions.setSubmitting(false);
        }}
        enableReinitialize
        validateOnChange
        validateOnMount
      >
        {({ values, isValid, setFieldValue, validateForm, resetForm }) => (
          <Form>
            {mode === 'scoring' ? (
              <>
                <Stack
                  spacing={2}
                  sx={{
                    maxWidth: '20rem',
                    mx: 'auto',
                    my: 4
                  }}
                >
                  {!isEditable && (
                    <Alert
                      severity="warning"
                      sx={{
                        fontWeight: 500,
                        border: '1px solid #ff9800'
                      }}
                    >
                      דף הניקוד נעול, אין באפשרותך לערוך אותו.
                    </Alert>
                  )}
                </Stack>

                <Paper
                  sx={{
                    p: 4,
                    mb: 2,
                    position: 'sticky',
                    top: theme => theme.mixins.toolbar.minHeight,
                    zIndex: 1
                  }}
                >
                  <Typography variant="h2" fontSize="1.25rem" fontWeight={500} align="center">
                    {values.score} נקודות
                  </Typography>
                </Paper>

                <Stack spacing={4}>
                  {SEASON_SCORESHEET.missions.map((mission, index) => (
                    <ScoresheetMission
                      key={mission.id}
                      missionIndex={index}
                      src={`/assets/scoresheet/missions/${mission.id}.webp`}
                      mission={mission}
                      errors={missionErrors.filter(e => e?.id.startsWith(mission.id))}
                    />
                  ))}
                </Stack>

                <Box py={4} justifyContent="center" display="flex">
                  {values.signature ? (
                    <Image
                      src={values.signature}
                      alt={`חתימת קבוצה #${team.number}`}
                      width={400}
                      height={200}
                      style={{ borderRadius: '8px', border: '1px solid #f1f1f1' }}
                    />
                  ) : (
                    <SignatureCanvas
                      canvasProps={{
                        width: 400,
                        height: 200,
                        style: { borderRadius: '8px', border: '1px solid #f1f1f1' }
                      }}
                      backgroundColor="#fff"
                      ref={ref => {
                        signatureRef.current = ref;
                      }}
                    />
                  )}
                </Box>

                {!isValid && (
                  <Alert
                    severity="warning"
                    sx={{
                      fontWeight: 500,
                      mb: 4,
                      maxWidth: '20rem',
                      mx: 'auto',
                      border: '1px solid #ff9800'
                    }}
                  >
                    דף הניקוד אינו מלא.
                  </Alert>
                )}

                <Stack direction="row" justifyContent="center">
                  <Button
                    variant="contained"
                    sx={{ minWidth: 200, mb: 6 }}
                    endIcon={<ChevronLeftIcon />}
                    disabled={!isValid}
                    onClick={() => {
                      if (signatureRef.current)
                        setFieldValue(
                          'signature',
                          signatureRef.current.getCanvas().toDataURL('image/png'),
                          true
                        );
                      setMode('gp');
                    }}
                  >
                    המשך
                  </Button>
                </Stack>
              </>
            ) : (
              <GpSelector
                onBack={() => setMode('scoring')}
                onSubmit={() => {
                  handleSync(false, values, 'completed').then(() =>
                    router.push(`/event/${event._id}/${user.role}`)
                  );
                }}
              />
            )}
          </Form>
        )}
      </Formik>
    </>
  );
};

export default ScoresheetForm;

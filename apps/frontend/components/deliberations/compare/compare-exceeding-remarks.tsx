import { useContext } from 'react';
import { ObjectId } from 'mongodb';
import { Stack, Typography } from '@mui/material';
import { localizedJudgingCategory, rubricsSchemas } from '@lems/season';
import { CompareContext } from './compare-view';

interface CompareExceedingRemarksProps {
  teamId: ObjectId;
}

const CompareExceedingRemarks: React.FC<CompareExceedingRemarksProps> = ({ teamId }) => {
  const { rubrics, category } = useContext(CompareContext);
  let teamRubrics = rubrics.filter(rubric => rubric.teamId === teamId);

  if (category) {
    teamRubrics = teamRubrics.filter(r => r.category === category);
  }

  return (
    <Stack px={2} height={192} sx={{ overflowY: 'auto' }}>
      {teamRubrics.map(rubric => {
        const schema = rubricsSchemas[rubric.category];
        const localizationMap = schema.sections
          .flatMap(section => section.fields)
          .reduce(
            (acc, field) => {
              acc[field.id] = field.title;
              return acc;
            },
            {} as Record<string, string>
          );
        const remarks = Object.entries(rubric.data?.values ?? {}).map(([key, value]) => {
          if (!value.notes) {
            return;
          }
          return (
            <Typography>
              <span style={{ fontWeight: 500 }}>{localizationMap[key]}:</span> "{value.notes}"
            </Typography>
          );
        });

        return (
          <Stack pb={2}>
            <Typography fontWeight={600}>
              {localizedJudgingCategory[rubric.category].name}
            </Typography>
            {!remarks.find(remark => !!remark) ? (
              <Typography>
                לא נמצאו ציונים ״מצטיינים״ בתחום {localizedJudgingCategory[rubric.category].name}
              </Typography>
            ) : (
              remarks
            )}
          </Stack>
        );
      })}
    </Stack>
  );
};

export default CompareExceedingRemarks;
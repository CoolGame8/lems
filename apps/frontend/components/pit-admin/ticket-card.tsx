import { WithId } from 'mongodb';
import { enqueueSnackbar } from 'notistack';
import { Socket } from 'socket.io-client';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2/';
import TaskIcon from '@mui/icons-material/Task';
import { Event, Team, Ticket, WSClientEmittedEvents, WSServerEmittedEvents } from '@lems/types';
import { localizeTeam } from '../../localization/teams';
import { localizedTicketTypes } from '../../localization/tickets';
import { useState } from 'react';

interface TicketCardProps {
  event: WithId<Event>;
  ticket: WithId<Ticket>;
  team: WithId<Team>;
  socket: Socket<WSServerEmittedEvents, WSClientEmittedEvents>;
}

const TicketCard: React.FC<TicketCardProps> = ({ event, ticket, team, socket }) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <Grid
        component={Paper}
        xs={5}
        key={ticket._id.toString()}
        p={2}
        height={225}
        overflow="auto"
        position="relative"
      >
        <Typography fontSize="1rem" fontWeight={700} gutterBottom>
          {localizeTeam(team)}
        </Typography>
        <Typography fontSize="1rem">{localizedTicketTypes[ticket.type]}</Typography>
        <Typography color="text.secondary">{ticket.content}</Typography>
        <Box display="flex" justifyContent="flex-end" position="absolute" bottom={10} right={10}>
          <IconButton onClick={() => setOpen(true)}>
            <TaskIcon />
          </IconButton>
        </Box>
      </Grid>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="abort-dialog-title"
        aria-describedby="abort-dialog-description"
      >
        <DialogTitle id="abort-dialog-title">סגירת קריאה</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            שימו לב! סגירת קריאה היא סופית ולא ניתן לבטל פעולה זו. האם אתם בטוחים?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} autoFocus>
            ביטול
          </Button>
          <Button
            onClick={() => {
              socket.emit(
                'updateTicket',
                event._id.toString(),
                team._id.toString(),
                ticket._id.toString(),
                { closed: new Date() },
                response => {
                  if (response.ok) {
                    enqueueSnackbar('הקריאה נסגרה בהצלחה!', { variant: 'success' });
                  } else {
                    enqueueSnackbar('אופס, סגירת הקריאות נכשלה', {
                      variant: 'error'
                    });
                  }
                }
              );
              setOpen(false);
            }}
          >
            אישור
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TicketCard;

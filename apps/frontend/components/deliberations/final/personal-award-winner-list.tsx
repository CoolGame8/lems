import { Stack, Box, Paper, Typography } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { AwardNames } from '@lems/types';
import { localizedAward } from '@lems/season';

interface PersonalAwardWinnerListProps {
  title: AwardNames;
  winners: Array<string>;
}

const PersonalAwardWinnerList: React.FC<PersonalAwardWinnerListProps> = ({ title, winners }) => {
  const awardIcons = [
    <EmojiEventsIcon fontSize="large" sx={{ color: '#fecb4d', ml: 3 }} />,
    <EmojiEventsIcon fontSize="large" sx={{ color: '#788991', ml: 3 }} />,
    <EmojiEventsIcon fontSize="large" sx={{ color: '#a97d4f', ml: 3 }} />,
    <WorkspacePremiumIcon fontSize="large" sx={{ color: '#5ebad9', ml: 3 }} />
  ];

  return (
    <Paper sx={{ p: 2, height: '100%', width: '100%' }}>
      <Typography align="center" fontWeight={500} gutterBottom>
        פרס {localizedAward[title].name}
      </Typography>
      <Grid container width="100%">
        <Grid xs={9}>
          <Stack spacing={2} alignItems="left" justifyContent="center" width="100%" px={1}>
            {winners.map(winner => (
              <Paper
                sx={{
                  border: `1px solid #ccc`,
                  borderRadius: 1,
                  minHeight: 35,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none'
                }}
              >
                {winner}
              </Paper>
            ))}
          </Stack>
        </Grid>
        <Grid xs={3}>
          <Stack spacing={2}>
            {[...Array(winners.length).keys()].map(index => (
              <Box
                position="relative"
                display="inline-flex"
                justifyContent="center"
                alignItems="center"
                minHeight={35}
              >
                {awardIcons[Math.min(index, 3)]}
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PersonalAwardWinnerList;
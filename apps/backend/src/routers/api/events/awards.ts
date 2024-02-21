import express, { Request, Response } from 'express';
import { WithId, ObjectId } from 'mongodb';
import asyncHandler from 'express-async-handler';
import fileUpload from 'express-fileupload';
import { Award, Team } from '@lems/types';
import * as db from '@lems/database';
import { updateAwardsFromFile } from 'apps/backend/src/lib/award-parser';

const router = express.Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  db.getEventAwards(new ObjectId(req.params.eventId)).then(awards => {
    res.json(awards);
  });
});

router.get('/:awardId', (req: Request, res: Response) => {
  db.getAward({
    _id: new ObjectId(req.params.awardId),
    eventId: new ObjectId(req.params.eventId)
  }).then(award => {
    res.json(award);
  });
});

router.put(
  '/winners',
  asyncHandler(async (req: Request, res: Response) => {
    const newAwards: Array<WithId<Award>> = req.body.awards;
    const advancingTeams: Array<WithId<Team>> = req.body.advancingTeams;

    newAwards.forEach(award => {
      award._id = new ObjectId(award._id);
      if (typeof award.winner === 'string' || !award.winner) return;
      award.winner._id = new ObjectId(award.winner?._id);
      award.winner.eventId = new ObjectId(award.winner?.eventId);
    });

    advancingTeams.forEach(team => {
      team._id = new ObjectId(team._id);
    });

    await Promise.all(
      newAwards.map(async (award: WithId<Award>) => {
        if (!(await db.updateAward({ _id: award._id }, { winner: award.winner })).acknowledged)
          return res.status(500).json({ ok: false });
      })
    );

    await Promise.all(
      advancingTeams.map(async (team: WithId<Team>) => {
        if (!(await db.updateTeam({ _id: team._id }, { advancing: true })).acknowledged)
          return res.status(500).json({ ok: false });
      })
    );

    res.json({ ok: true });
  })
);

router.post(
  '/winners/parse',
  fileUpload(),
  asyncHandler(async (req: Request, res: Response) => {
    const event = await db.getEvent({ _id: new ObjectId(req.params.eventId) });
    console.log(`👓 Parsing awards upload for event ${event._id}...`);

    const csvData = (req.files.file as fileUpload.UploadedFile)?.data.toString();
    const teams = await db.getEventTeams(event._id);
    const awards = await db.getEventAwards(event._id);

    const updatedRecords = updateAwardsFromFile(teams, awards, csvData);

    await Promise.all(
      updatedRecords.awards.map(async (award: WithId<Award>) => {
        if (!(await db.updateAward({ _id: award._id }, award)).acknowledged)
          throw new Error('Could not update awards!');
      })
    );
    await Promise.all(
      updatedRecords.teams.map(async (team: WithId<Team>) => {
        if (!(await db.updateTeam({ _id: team._id }, team)).acknowledged)
          throw new Error('Could not update awards!');
      })
    );

    res.json({ ok: true });
  })
);

export default router;

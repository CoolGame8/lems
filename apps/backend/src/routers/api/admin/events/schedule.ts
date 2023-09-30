import express, { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import fileUpload from 'express-fileupload';
import * as db from '@lems/database';
import { getEventUsers } from '../../../../lib/schedule/event-users';
import { getEventRubrics } from '../../../../lib/schedule/event-rubrics';
import { parseEventData, parseEventSchedule } from '../../../../lib/schedule/parser';
import { getEventScoresheets } from '../../../../lib/schedule/event-scoresheets';

const router = express.Router({ mergeParams: true });

router.post('/parse', fileUpload(), async (req: Request, res: Response) => {
  try {
    const event = await db.getEvent({ _id: new ObjectId(req.params.eventId) });

    const eventState = await db.getEventState({ event: event._id });
    if (eventState)
      return res.status(400).json({ error: 'Could not parse schedule: Event has data' });

    console.log('👓 Parsing file...');
    const csvData = (req.files.file as fileUpload.UploadedFile)?.data.toString('utf8');

    const { teams, tables, rooms } = await parseEventData(event, csvData);

    console.log('📄 Inserting teams, tables, and rooms');

    if (!(await db.addTeams(teams)).acknowledged)
      return res.status(500).json({ error: 'Could not insert teams!' });
    if (!(await db.addTables(tables)).acknowledged)
      return res.status(500).json({ error: 'Could not insert tables!' });
    if (!(await db.addRooms(rooms)).acknowledged)
      return res.status(500).json({ error: 'Could not insert rooms!' });

    const dbTeams = await db.getEventTeams(event._id);
    const dbTables = await db.getEventTables(event._id);
    const dbRooms = await db.getEventRooms(event._id);

    console.log('📄 Parsing schedule');

    const { matches, sessions } = await parseEventSchedule(
      event,
      dbTeams,
      dbTables,
      dbRooms,
      csvData
    );

    if (!(await db.addSessions(sessions)).acknowledged)
      return res.status(500).json({ error: 'Could not insert sessions!' });

    if (!(await db.addMatches(matches)).acknowledged)
      return res.status(500).json({ error: 'Could not insert matches!' });

    console.log('✅ Finished parsing schedule!');

    const dbSessions = await db.getEventSessions(event._id);
    const dbMatches = await db.getEventMatches(event._id.toString());

    console.log('📄 Generating rubrics');
    const rubrics = getEventRubrics(dbSessions);
    if (!(await db.addRubrics(rubrics)).acknowledged)
      return res.status(500).json({ error: 'Could not create rubrics!' });
    console.log('✅ Generated rubrics');

    console.log('📄 Generating scoresheets');
    const scoresheets = getEventScoresheets(dbMatches);

    if (!(await db.addScoresheets(scoresheets)).acknowledged)
      return res.status(500).json({ error: 'Could not create scoresheets!' });
    console.log('✅ Generated scoresheets!');

    console.log('👤 Generating event users');
    const users = getEventUsers(event, dbTables, dbRooms);
    if (!(await db.addUsers(users)).acknowledged)
      return res.status(500).json({ error: 'Could not create users!' });
    console.log('✅ Generated event users');

    console.log('🔐 Creating event state');
    await db.addEventState({
      event: event._id,
      activeMatch: null,
      loadedMatch: null,
      currentSession: null,
      currentMatch: 0,
      activeSession: 0
    });
    console.log('✅ Created event state');

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log('❌ Error parsing schedule');
    console.log(error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

router.post('/generate', (req: Request, res: Response) => {
  res.status(501).json({ error: 'NOT_IMPLEMENTED' });
});

export default router;

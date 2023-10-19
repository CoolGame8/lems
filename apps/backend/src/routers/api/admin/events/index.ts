import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Event } from '@lems/types';
import * as db from '@lems/database';
import eventScheduleRouter from './schedule';
import eventUsersRouter from './users';
import eventAwardsRouter from './awards';
import { cleanEventData } from '../../../../lib/schedule/cleaner';

const router = express.Router({ mergeParams: true });

router.post('/', (req: Request, res: Response) => {
  const body: Event = { ...req.body };
  body.startDate = new Date(body.startDate);
  body.endDate = new Date(body.endDate);

  if (body) {
    console.log('⏬ Creating Event...');
    db.addEvent(body).then(task => {
      if (task.acknowledged) {
        console.log('✅ Event created!');
        return res.json({ ok: true, id: task.insertedId });
      } else {
        console.log('❌ Could not create Event');
        return res.status(500).json({ ok: false });
      }
    });
  } else {
    return res.status(400).json({ ok: false });
  }
});

router.put('/:eventId', (req: Request, res: Response) => {
  const body: Event = { ...req.body };
  body.startDate = new Date(body.startDate);
  body.endDate = new Date(body.endDate);

  if (body.schedule)
    body.schedule = body.schedule.map(e => {
      return { ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) };
    });

  if (body) {
    console.log(`⏬ Updating Event ${req.params.eventId}`);
    db.updateEvent({ _id: new ObjectId(req.params.eventId) }, body, true).then(task => {
      if (task.acknowledged) {
        console.log('✅ Event updated!');
        return res.json({ ok: true, id: task.upsertedId });
      } else {
        console.log('❌ Could not update Event');
        return res.status(500).json({ ok: false });
      }
    });
  } else {
    return res.status(400).json({ ok: false });
  }
});

router.delete('/:eventId/data', async (req: Request, res: Response) => {
  const event = await db.getEvent({ _id: new ObjectId(req.params.eventId) });

  console.log(`🚮 Deleting data from event ${req.params.eventId}`);
  try {
    await cleanEventData(event);
    await db.updateEvent({ _id: event._id }, { hasState: false });
  } catch (error) {
    return res.status(500).json(error.message);
  }
  console.log('✅ Deleted event data!');
  return res.status(200).json({ ok: true });
});

router.use('/:eventId/schedule', eventScheduleRouter);
router.use('/:eventId/users', eventUsersRouter);
router.use('/:eventId/awards', eventAwardsRouter);

export default router;

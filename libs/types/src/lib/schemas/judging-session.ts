import { ObjectId } from 'mongodb';
import { Status } from '../constants';

export interface JudgingSession {
  eventId: ObjectId;
  number: number;
  teamId: ObjectId | null;
  roomId: ObjectId;
  status: Status;
  scheduledTime: Date;
  startTime?: Date;
}

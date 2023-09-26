import { ObjectId } from 'mongodb';

export interface Team {
  event: ObjectId;
  number: number;
  name: string;
  registered: boolean;
  affiliation: { institution: string; city: string };
  profileDocument?: { id: string; link: string };
}
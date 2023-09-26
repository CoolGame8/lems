import express, { NextFunction, Request, Response } from 'express';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import * as db from '@lems/database';
import { User } from '@lems/types';
import { JwtTokenData } from '../types/auth';

const router = express.Router({ mergeParams: true });

const jwtSecret = process.env.JWT_SECRET;

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const loginDetails: User = req.body;
  if (loginDetails.event) loginDetails.event = new ObjectId(loginDetails.event);
  if (loginDetails.roleAssociation && loginDetails.roleAssociation.type != 'category')
    loginDetails.roleAssociation.value = new ObjectId(loginDetails.roleAssociation.value);

  try {
    const user = await db.getUser({ ...loginDetails });

    if (!user) {
      console.log(
        `🔑 Login failed ${loginDetails.event ? `to event ${loginDetails.event}` : ''}: ${
          loginDetails.role || 'admin'
        }`
      );
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    console.log(
      `🔑 Login successful ${loginDetails.event ? `to event ${loginDetails.event}` : ''}: ${
        loginDetails.role || 'admin'
      }`
    );

    const expires = dayjs().endOf('day');
    const expiresInSeconds = expires.diff(dayjs(), 'second');

    const token = jwt.sign(
      {
        userId: user._id
      } as JwtTokenData,
      jwtSecret,
      {
        issuer: 'FIRST',
        expiresIn: expiresInSeconds
      }
    );

    res.cookie('auth-token', token, { expires: expires.toDate(), httpOnly: true, secure: true });

    const { password, lastPasswordSetDate, ...safeUser } = user;
    return res.json({ ...safeUser });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  console.log(`🔒 Logout successful`);
  res.clearCookie('auth-token');
  return res.json({ ok: true });
});

export default router;
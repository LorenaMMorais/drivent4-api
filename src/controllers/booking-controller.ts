import { Response } from 'express';
import httpStatus from 'http-status';
import { listBooking, insertBooking, updateBookingService } from '@/services/booking-service';
import { AuthenticatedRequest } from '@/middlewares';

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  const { userId }: { userId: number } = req;

  try {
    const booking = await listBooking(userId);

    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const { roomId } = req.body;

  try {
    const booking = await insertBooking(roomId, userId);

    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    if (error.name === 'Forbidden') return res.sendStatus(httpStatus.FORBIDDEN);

    if (error.name === 'NotFoundError') return res.sendStatus(httpStatus.NOT_FOUND);

    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

export async function updateBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const { roomId } = req.body;
  const { bookingId } = req.params;

  try {
    await updateBookingService(roomId, userId, Number(bookingId));

    return res.sendStatus(httpStatus.OK);
  } catch (error) {
    if (error.name === 'Forbidden') return res.sendStatus(httpStatus.FORBIDDEN);

    if (error.name === 'NotFoundError') return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

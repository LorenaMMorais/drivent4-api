import { notFoundError, unauthorizedError } from '@/errors';
import bookingRepository from '@/repositories/booking-repository';
import ticketsRepository from '@/repositories/tickets-repository';
import { forbiddenError } from '@/errors/forbidden-error';

export async function listBooking(userId: number) {
  const booking = await bookingRepository.getBooking(userId);

  if (!booking) throw forbiddenError();

  return booking;
}

export async function insertBooking(roomId: number, userId: number) {
  const booking = await bookingRepository.createBooking(roomId, userId);
  const room = await bookingRepository.findRoomById(roomId);
  const bookings = await bookingRepository.findBookings(roomId);

  const ticket = await ticketsRepository.findTicketByUserId(userId);
  const notPaid = ticket.status === 'RESERVED';
  const isRemote = ticket.TicketType.isRemote;
  const includesHotel = ticket.TicketType.includesHotel;

  if (!roomId || !userId) throw notFoundError();

  if (bookings.length >= room.capacity) throw forbiddenError();

  if (notPaid || isRemote || !includesHotel) throw forbiddenError();

  return booking;
}

export async function updateBookingService(roomId: number, userId: number, bookingId: number) {
  const booking = await bookingRepository.getBooking(userId);

  if (!booking) throw forbiddenError();

  const room = await bookingRepository.findRoomById(roomId);

  if (!room) throw notFoundError();

  const bookingUser = bookingId === booking.id;

  if (!bookingUser) throw forbiddenError();

  const newBooking = await bookingRepository.updateBooking(bookingId, roomId);

  return newBooking;
}

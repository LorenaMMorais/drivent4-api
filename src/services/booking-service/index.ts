import { notFoundError, unauthorizedError } from '@/errors';
import bookingRepository from '@/repositories/booking-repository';
import ticketsRepository from '@/repositories/tickets-repository';

export async function listBooking(userId: number) {
  const booking = await bookingRepository.getBooking(userId);

  if (!booking) throw notFoundError();

  return { booking: booking.id, Room: booking.Room };
}

export async function verifyingVacancy(roomId: number) {
  const room = await bookingRepository.findRoomById(roomId);
  const bookings = await bookingRepository.findBookings(roomId);

  if (!room) throw notFoundError();

  if (bookings.length >= room.capacity) throw notFoundError();
}

export async function insertBooking(roomId: number, userId: number) {
  const ticket = await ticketsRepository.findTicketByUserId(userId);
  const statusTicket = ticket.status === 'RESERVED';
  const isRemote = ticket.TicketType.isRemote;
  const includesHotel = ticket.TicketType.includesHotel;

  if (statusTicket || isRemote || !includesHotel) throw notFoundError();

  await verifyingVacancy(roomId);

  const booking = await bookingRepository.createBooking(roomId, userId);

  return booking;
}

export async function updateBookingService(roomId: number, userId: number, bookingId: number) {
  const booking = await bookingRepository.getBooking(userId);

  if (!booking) throw notFoundError();

  const room = await bookingRepository.findRoomById(roomId);

  if (!room) throw notFoundError();

  const bookingUser = bookingId === booking.id;

  if (!bookingUser) throw unauthorizedError();

  const newBooking = await bookingRepository.updateBooking(bookingId, roomId);

  return newBooking;
}
/*
const bookingService = {
  listBooking,
  insertBooking,
  updateBooking,
};

export default bookingService;
 */

import httpStatus from 'http-status';
import supertest from 'supertest';
import faker from '@faker-js/faker';
import * as jwt from 'jsonwebtoken';
import { TicketStatus } from '@prisma/client';
import { cleanDb, generateValidToken } from '../helpers';
import {
  createUser,
  createBooking,
  createHotel,
  createPayment,
  createTicket,
  createEnrollmentWithAddress,
  createRoomWithHotelId,
  createTicketType,
  createTicketTypeNoRemote,
  createTicketTypeWithHotel,
  createTicketTypeWithoutHotel,
} from '../factories';
import app, { init } from '@/app';

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe('GET /booking', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.get('/booking');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if token is invalid', async () => {
    const token = faker.lorem.word();

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe('GET /booking: When token is valid', () => {
  it('should respond with status 404 if does not have an enrollment', async () => {
    const token = await generateValidToken();

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it('should respond with status 404 if user does not have a booking', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    await createEnrollmentWithAddress(user);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it('should respond with status 200 and return data booking', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const createdHotel = await createHotel();

    const room = await createRoomWithHotelId(createdHotel.id);
    const booking = await createBooking(user.id, room.id);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.OK);
    expect(response.body).toEqual({
      id: booking.id,
      Room: {
        id: booking.roomId,
        name: room.name,
        capacity: room.capacity,
        hotelId: createdHotel.id,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
    });
  });
});

describe('POST /booking', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.post('/booking');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if token is invalid', async () => {
    const token = faker.lorem.word();

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if no there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe('POST /booking: When token is valid', () => {
  it('should respond with status 404 if param roomId is missing', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createHotel();
    await createPayment(ticket.id, ticketType.price);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({});

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it('should respond with status 404 if room does not exist', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createHotel();
    await createPayment(ticket.id, ticketType.price);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
      roomId: 0,
    });

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it('should respond with status 403 if ticket type is remote', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeNoRemote();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();
    await createPayment(ticket.id, ticketType.price);
    const room = await createRoomWithHotelId(hotel.id);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
      roomId: room.id,
    });

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it('should respond with status 403 if ticket is not paid', async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();
    await createPayment(ticket.id, ticketType.price);
    const room = await createRoomWithHotelId(hotel.id);
    await createBooking(otherUser.id, room.id);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
      roomId: room.id,
    });

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it('should respond with status 403 if ticket type is not include hotel', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithoutHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();
    await createPayment(ticket.id, ticketType.price);
    const room = await createRoomWithHotelId(hotel.id);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
      roomId: room.id,
    });

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it('should respond with status 403 if the capacity of the room is filled', async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();
    await createPayment(ticket.id, ticketType.price);
    const room = await createRoomWithHotelId(hotel.id);
    await createBooking(otherUser.id, room.id);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
      roomId: room.id,
    });

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it('should respond with status 200 and return data booking', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createPayment(ticket.id, ticketType.price);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    await createBooking(user.id, room.id);

    const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
      roomId: room.id,
    });

    expect(response.status).toBe(httpStatus.OK);
  });
});

describe('UPDATE /booking/:bookingId', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.put('/booking/:bookingId');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if token is invalid', async () => {
    const token = faker.lorem.word();

    const response = await server.put('/booking/:bookingId').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if no there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put('/booking/:bookingId').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe('UPDATE /booking/:bookingId: When token is valid', () => {
  it('should respond with status 403 if the capacity of the room is filled', async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();
    await createPayment(ticket.id, ticketType.price);
    const room = await createRoomWithHotelId(hotel.id);
    await createBooking(user.id, room.id);
    const booking = await createBooking(otherUser.id, room.id);

    const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send({
      roomId: room.id,
    });

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });
});

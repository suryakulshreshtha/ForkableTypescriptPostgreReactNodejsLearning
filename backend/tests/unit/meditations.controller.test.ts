import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createMeditationsController } from '../../src/controllers/meditations.controller';

describe('meditations.controller (unit, mocked pg)', () => {
  let mockPool: jest.Mocked<Pool>;
  let controller: ReturnType<typeof createMeditationsController>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    mockPool = { query: jest.fn() } as unknown as jest.Mocked<Pool>;
    controller = createMeditationsController(mockPool);

    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    req = { params: {}, query: {}, body: {} };
    res = { status: statusMock, json: jsonMock, send: sendMock };
    next = jest.fn();
  });

  describe('getAllMeditations', () => {
    it('returns all meditations when no category filter is given', async () => {
      const rows = [{ id: 1, title: 'Morning Sit' }];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows });

      await controller.getAllMeditations(req as Request, res as Response, next);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM meditations ORDER BY created_at DESC');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(rows);
    });

    it('filters by category when provided as a query param', async () => {
      req.query = { category: 'walking' };
      const rows = [{ id: 2, title: 'Walking Meditation', category: 'walking' }];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows });

      await controller.getAllMeditations(req as Request, res as Response, next);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM meditations WHERE category = $1 ORDER BY created_at DESC',
        ['walking']
      );
      expect(jsonMock).toHaveBeenCalledWith(rows);
    });
  });

  describe('createMeditation', () => {
    it('returns 400 when title is missing', async () => {
      req.body = { category: 'sitting', duration_minutes: 10 };
      await controller.createMeditation(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('returns 400 when category is not a recognized value', async () => {
      req.body = { title: 'Mystery Session', category: 'floating', duration_minutes: 10 };
      await controller.createMeditation(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('category must be one of') })
      );
    });

    it('returns 400 when duration_minutes is zero or negative', async () => {
      req.body = { title: 'Bad Duration', category: 'sitting', duration_minutes: 0 };
      await controller.createMeditation(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('returns 201 with the created meditation on valid input', async () => {
      const created = { id: 5, title: 'Evening Lie-Down', category: 'lying', duration_minutes: 20 };
      req.body = { title: 'Evening Lie-Down', category: 'lying', duration_minutes: 20 };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [created] });

      await controller.createMeditation(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(created);
    });
  });

  describe('getMeditationById', () => {
    it('returns 404 when not found', async () => {
      req.params = { id: '999' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await controller.getMeditationById(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteMeditation', () => {
    it('returns 204 when deletion succeeds', async () => {
      req.params = { id: '3' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 3 }] });

      await controller.deleteMeditation(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('returns 404 when the meditation to delete does not exist', async () => {
      req.params = { id: '404' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await controller.deleteMeditation(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('error handling', () => {
    it('calls next(err) when the query rejects', async () => {
      const dbError = new Error('connection lost');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await controller.getAllMeditations(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});

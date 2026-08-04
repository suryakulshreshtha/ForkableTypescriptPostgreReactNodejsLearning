import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createRetreatsController } from '../../src/controllers/retreats.controller';

describe('retreats.controller (unit, mocked pg)', () => {
  let mockPool: jest.Mocked<Pool>;
  let controller: ReturnType<typeof createRetreatsController>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockPool = { query: jest.fn() } as unknown as jest.Mocked<Pool>;
    controller = createRetreatsController(mockPool);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = { params: {}, body: {} };
    res = { status: statusMock, json: jsonMock };
    next = jest.fn();
  });

  describe('createRetreat', () => {
    it('returns 400 for an unrecognized retreat_type', async () => {
      req.body = {
        title: 'Mystery Retreat',
        location: 'Nowhere',
        retreat_type: 'Weekend',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        capacity: 100,
      };

      await controller.createRetreat(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('returns 400 when capacity is not a positive integer', async () => {
      req.body = {
        title: 'Zero Capacity',
        location: 'Nowhere',
        retreat_type: 'Progressive',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        capacity: 0,
      };

      await controller.createRetreat(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('registerForRetreat', () => {
    it('returns 404 when the retreat does not exist', async () => {
      req.params = { id: '999' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await controller.registerForRetreat(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('returns 200 with the updated retreat when a spot is available', async () => {
      req.params = { id: '1' };
      const updated = { id: 1, capacity: 10, registered_count: 6 };
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, capacity: 10, registered_count: 5 }] }) // existence check
        .mockResolvedValueOnce({ rows: [updated] }); // atomic update

      await controller.registerForRetreat(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updated);
    });

    it('returns 409 when the atomic update finds no room (capacity reached)', async () => {
      req.params = { id: '1' };
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, capacity: 10, registered_count: 10 }] }) // existence check
        .mockResolvedValueOnce({ rows: [] }); // atomic update finds no row where registered_count < capacity

      await controller.registerForRetreat(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('full capacity') })
      );
    });

    it('issues the capacity check and the increment as a single atomic query', async () => {
      req.params = { id: '7' };
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [{ id: 7, registered_count: 1 }] });

      await controller.registerForRetreat(req as Request, res as Response, next);

      expect(mockPool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('WHERE id = $1 AND registered_count < capacity'),
        ['7']
      );
    });
  });
});

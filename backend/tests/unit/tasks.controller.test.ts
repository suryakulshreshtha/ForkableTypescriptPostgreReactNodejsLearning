import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createTasksController } from '../../src/controllers/tasks.controller';

/**
 * Unit tests: the pg Pool is fully mocked, so these run without any real
 * database connection and stay fast + deterministic. They exercise the
 * controller's branching logic (validation, 404s, status codes) in isolation.
 */
describe('tasks.controller (unit, mocked pg)', () => {
  let mockPool: jest.Mocked<Pool>;
  let controller: ReturnType<typeof createTasksController>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    mockPool = { query: jest.fn() } as unknown as jest.Mocked<Pool>;
    controller = createTasksController(mockPool);

    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    req = { params: {}, body: {} };
    res = { status: statusMock, json: jsonMock, send: sendMock };
    next = jest.fn();
  });

  describe('getAllTasks', () => {
    it('returns 200 with the list of tasks', async () => {
      const rows = [{ id: 1, title: 'Write tests' }];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows });

      await controller.getAllTasks(req as Request, res as Response, next);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM tasks ORDER BY created_at DESC');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(rows);
    });

    it('calls next(err) when the query rejects', async () => {
      const dbError = new Error('connection lost');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await controller.getAllTasks(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('getTaskById', () => {
    it('returns 200 with the task when found', async () => {
      const task = { id: 5, title: 'Found me' };
      req.params = { id: '5' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [task] });

      await controller.getTaskById(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(task);
    });

    it('returns 404 when the task does not exist', async () => {
      req.params = { id: '999' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await controller.getTaskById(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Task 999 not found' });
    });
  });

  describe('createTask', () => {
    it('returns 400 when title is missing', async () => {
      req.body = { description: 'no title here' };

      await controller.createTask(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('returns 400 when title is an empty/whitespace string', async () => {
      req.body = { title: '   ' };

      await controller.createTask(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('returns 201 with the created task on valid input', async () => {
      const created = { id: 1, title: 'New task', description: null };
      req.body = { title: 'New task' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [created] });

      await controller.createTask(req as Request, res as Response, next);

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
        ['New task', null]
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(created);
    });
  });

  describe('updateTask', () => {
    it('returns 404 when updating a task that does not exist', async () => {
      req.params = { id: '42' };
      req.body = { title: 'Updated' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await controller.updateTask(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('falls back to existing values for fields omitted from the body', async () => {
      const existing = { id: 3, title: 'Old', description: 'Old desc', is_complete: false };
      const updated = { ...existing, title: 'New title', updated_at: 'now' };
      req.params = { id: '3' };
      req.body = { title: 'New title' };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existing] })
        .mockResolvedValueOnce({ rows: [updated] });

      await controller.updateTask(req as Request, res as Response, next);

      expect(mockPool.query).toHaveBeenLastCalledWith(expect.any(String), [
        'New title',
        'Old desc',
        false,
        '3',
      ]);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteTask', () => {
    it('returns 204 when deletion succeeds', async () => {
      req.params = { id: '7' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 7 }] });

      await controller.deleteTask(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('returns 404 when the task to delete does not exist', async () => {
      req.params = { id: '404' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await controller.deleteTask(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});

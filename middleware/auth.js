import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Validate payload id and fetch user
      const rawId = decoded && decoded.id;
      const id = Number(rawId);
      if (!Number.isInteger(id)) {
        return res.status(401).json({ message: 'Not authorized, invalid token payload' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true }
      });
      if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });
      req.user = user;

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export default { protect };

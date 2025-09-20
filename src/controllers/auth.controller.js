import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../utils/prisma.js";

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing)
      return res.status(409).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { email, username, password: hashed },
    });

    const token = generateToken(newUser.id);
    res.status(201).json({
      message: "Registered",
      user: { id: newUser.id, email, username },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error => register" });
  }
};


const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user.id);
    res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email, username: user.username },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error => login" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000); // 1h

      await prisma.resetToken.create({
        data: { token: resetToken, userId: user.id, expiresAt },
      });

      const resetURL = `http://localhost:3000/api/reset-password?token=${resetToken}`;
      return res.json({ message: "Password reset link created", resetURL });
    }

    res.json({ message: "If email exists, reset link created" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error => Forgot password", error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    
    const { token } = req.query;
    const { password } = req.body;

    const resetTokenRecord = await prisma.resetToken.findUnique({
      where: { token },
    });

    if (!resetTokenRecord || resetTokenRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: resetTokenRecord.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.resetToken.delete({ where: { token } });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error => Reset password", error: err.message });
  }
};

export { register, login, forgotPassword, resetPassword };

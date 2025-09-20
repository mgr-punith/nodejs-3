import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../utils/prisma.js";
import { sendMail } from "../utils/mailer.js";
import { forgotPasswordSchema } from "../validations/auth.validaion.js";

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

// Register
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

// Login
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

// Forgot Password
// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);  

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000); 

      await prisma.resetToken.create({
        data: { token: resetToken, userId: user.id, expiresAt },
      });

      const resetURL = `http://localhost:3000/reset-password?token=${resetToken}`;
      await sendMail(user.email, "Password Reset", `Click here: ${resetURL}`);
    }

    res.json({
      message: "Password reset link has been sent (if the email exists).",
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


export { register, login, forgotPassword };

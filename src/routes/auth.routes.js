import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
} from "../controllers/auth.controller.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
} from "../validations/auth.validaion.js";

const router = Router();

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    console.log("Validation Error ", result.error);
    return res
      .status(400)
      .json({ errors: result.error});
  }
  next();
};

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

export default router;

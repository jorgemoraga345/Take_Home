import { Router } from "express";
import * as authControllers from '../controllers'

const router = Router();

router.post(
  '/register',
  authControllers.registerUser
);

router.post(
  '/login',
  authControllers.loginUser
);

export default router;
import { Router } from "express";
import * as userControllers from '../controllers';

import { protect } from '../middlewares/';

const router = Router();

router.use(protect);

router.put(
  '/profile',
  userControllers.updateProfile
);

router.put(
  '/change-password',
  userControllers.changePassword
);

router.get(
  '/me',
  userControllers.getMe
);

export default router;
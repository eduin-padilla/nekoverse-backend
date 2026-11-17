import { Router } from "express";
import { registerController, loginController, getProfileController, updateProfileController, changePasswordController, logoutController } from "../controllers/authController.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.post("/logout", authMiddleware, logoutController);
authRouter.get("/me", authMiddleware, getProfileController);
authRouter.patch("/me", authMiddleware, updateProfileController);
authRouter.patch("/change-password", authMiddleware, changePasswordController);
 


export default authRouter;

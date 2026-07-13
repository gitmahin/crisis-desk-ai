import { Router } from "express";
const router: Router = Router();

// Routers imports
import reportRouter from "./reports.route";
import userRouter from "./user.route";

router.use("/reports", reportRouter);
router.use("/user", userRouter);

export default router;

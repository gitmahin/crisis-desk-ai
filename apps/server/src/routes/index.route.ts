import { Router } from "express";
const router: Router = Router();

// Routers imports
import reportRouter from "./reports.route";
import userRouter from "./user.route";

router.use("/v1/reports", reportRouter);
router.use("/v1/user", userRouter);

export default router;

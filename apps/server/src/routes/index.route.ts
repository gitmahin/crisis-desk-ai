import {Router} from "express"
const router: Router = Router()


// Routers imports
import reportRouter from "./reports.route"
router.use("/reports", reportRouter)
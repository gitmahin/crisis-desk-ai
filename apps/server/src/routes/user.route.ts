import { UserController } from "@/controllers/user.controller"
import { asyncHandler } from "@/utils"
import {Router} from "express"

const router: Router = Router()

const userController = new UserController()

router.route("/login").get(asyncHandler(userController.loginUser.bind(userController)))
router.route("/create").post(asyncHandler(userController.createUser.bind(userController)))


export default router
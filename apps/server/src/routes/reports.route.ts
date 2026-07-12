import {Router} from "express"
const router: Router = Router()


router.route("/").get()
router.route("/").post()
router.route("/:id").get()
router.route("/:id/status").patch()
router.route("/:id").delete()
router.route("/stats/summary").delete()

export default router
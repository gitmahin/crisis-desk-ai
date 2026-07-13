import {resetDb} from "@repo/shared"
import { postgres } from "./db.connect"


resetDb(postgres)
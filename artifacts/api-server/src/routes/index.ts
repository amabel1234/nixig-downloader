import { Router, type IRouter } from "express";
import healthRouter from "./health";
import downloadRouter from "./download";
import statusRouter from "./status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(downloadRouter);
router.use(statusRouter);

export default router;

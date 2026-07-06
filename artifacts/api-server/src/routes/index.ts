import { Router, type IRouter } from "express";
import healthRouter from "./health";
import downloadRouter from "./download";
import statusRouter from "./status";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(downloadRouter);
router.use(statusRouter);
router.use(reviewsRouter);

export default router;

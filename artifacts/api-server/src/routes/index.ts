import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(dashboardRouter);

export default router;

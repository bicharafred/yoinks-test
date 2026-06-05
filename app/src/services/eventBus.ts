import { Subject } from "rxjs";

export const globalEvents = new Subject<{ type: "LOGOUT" }>();

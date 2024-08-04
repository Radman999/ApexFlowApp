// app.routes.ts
import { Routes } from "@angular/router";
import { AuthGuard } from "./auth.guard"; // Import the auth guard

export const routes: Routes = [
  {
    path: "home",
    loadComponent: () => import("./home/home.page").then((m) => m.HomePage),
    canActivate: [AuthGuard] // Protect the home route
  },
  {
    path: "test",
    loadComponent: () => import("./test/test.page").then((m) => m.TestPage),
    canActivate: [AuthGuard] // Protect the test route
  },
  {
    path: "login",
    loadComponent: () => import("./pages/login/login.page").then((m) => m.LoginPage),
  },
  {
    path: "",
    redirectTo: "login", // Redirect unauthenticated users to login
    pathMatch: "full",
  },
];

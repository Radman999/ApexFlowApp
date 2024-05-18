import { Routes } from "@angular/router";

export const routes: Routes = [
	{
		path: "home",
		loadComponent: () => import("./home/home.page").then((m) => m.HomePage),
	},
	{
		path: "",
		redirectTo: "home",
		pathMatch: "full",
	},
	{
		path: "test",
		loadComponent: () => import("./test/test.page").then((m) => m.TestPage),
	},
	{
		path: "login",
		loadComponent: () =>
			import("./pages/login/login.page").then((m) => m.LoginPage),
	},
];

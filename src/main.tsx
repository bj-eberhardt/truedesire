import "./bootstrap.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element missing");
}

void import("./app/AppRuntime").then(({ mountApp }) => {
  mountApp(rootElement);
});

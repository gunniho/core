// app.ts — THE DESIGN APP, on design.<zone> for members: the component preview library of
// @ritvel/ui. It has no page of its own: it serves the library's files (packages/ui/src) and
// opens on its gallery, so what the page shows is the code every other app loads. To change
// what it shows, change packages/ui/src/gallery.js.
import { type AppDescription, serveFiles } from "iterate/sdk";
import { ritvelUi } from "../../packages/ui/files.ts";
import { openFile } from "../open-files.ts";
import theme from "../theme.css";

/** WHAT THE DESIGN APP SAYS OF ITSELF: the mind's sign-in pages show its name and its icon, and
 *  open on the passkey, since it is for members (../open-files.ts answers it to anyone). */
const DESIGN: AppDescription = { name: "Design", icon: "/icon.svg", for: "members" };

export function designApp() {
  return {
    /** The app's description and icon, for anyone: worker.ts asks this before its guard
     *  (../open-files.ts). */
    open: (request: Request) => openFile(request, DESIGN),
    /** Every request on the app's host. worker.ts guards it, so a member alone gets here. */
    fetch(request: Request) {
      return serveFiles(request, {
        index: ritvelUi["ui/gallery.html"] as string,
        files: { ...ritvelUi, "theme.css": theme },
      });
    },
  };
}

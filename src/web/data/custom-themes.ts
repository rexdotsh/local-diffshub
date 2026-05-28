import { registerCustomTheme } from "@pierre/diffs";
import pierreDarkSoft from "@pierre/theme/pierre-dark-soft";
import pierreLightSoft from "@pierre/theme/pierre-light-soft";

// theme.name must equal the registration key (pierre validates in resolveTheme).
registerCustomTheme("diffhub-dark", () =>
  Promise.resolve({
    ...pierreDarkSoft,
    name: "diffhub-dark",
    colors: {
      ...pierreDarkSoft.colors,
      "editor.background": "#0f1011",
      "sideBar.background": "#0b0c0d",
      "sideBar.foreground": "#c9cccf",
      "sideBarSectionHeader.foreground": "#9aa0a6",
      "editorLineNumber.foreground": "#3c4046",
      "editorLineNumber.activeForeground": "#8a9098",
    },
  } as never)
);

registerCustomTheme("diffhub-light", () =>
  Promise.resolve({
    ...pierreLightSoft,
    name: "diffhub-light",
    colors: {
      ...pierreLightSoft.colors,
      "editor.background": "#fdfdfc",
      "sideBar.background": "#f6f5f2",
      "sideBar.foreground": "#42433f",
      "sideBarSectionHeader.foreground": "#7a7c78",
    },
  } as never)
);

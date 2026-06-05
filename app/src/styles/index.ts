const colorPalette = {
  gray: {
    0: "#fff",
    50: "#f0f1f2",
    100: "#C8CACC",
    200: "#AAAEB2",
    300: "#737980",
    350: "#161819",
    400: "#33383E",
    500: "#262A2E",
    550: "#16181A",
    600: "#000000",
  },
  brand: {
    0: "#FFF8F2",
    50: "#FFF0E5",
    100: "#FFC399",
    200: "#FF9E59",
    300: "#FF5533",
    400: "#8C3A00",
    500: "#662A00",
    550: "#401E06",
    600: "#331805",
  },
  red: {
    0: "#FFF2F2",
    50: "#FFE5E5",
    100: "#FFB2B2",
    200: "#FF8C8C",
    300: "#F20000",
    400: "#8C0000",
    500: "#660000",
    550: "#400606",
    600: "#330505",
  },
  yellow: {
    0: "#FFFBF2",
    50: "#FFF6E5",
    100: "#FFDD99",
    200: "#FFC859",
    300: "#C48300",
    400: "#785000",
    500: "#593C00",
    550: "#332405",
    600: "#261B04",
  },
  green: {
    0: "#F2FFF5",
    50: "#DBFFE4",
    100: "#AAF2BC",
    200: "#5CE57E",
    300: "#009E28",
    400: "#005916",
    500: "#004712",
    550: "#00330D",
    600: "#04260C",
  },
  blue: {
    0: "#F2F8FF",
    50: "#E5F0FF",
    100: "#BFDAFF",
    200: "#80B5FF",
    300: "#006AFF",
    400: "#0045A6",
    500: "#003073",
    550: "#00204D",
    600: "#04152B",
  },
  alphaWhite: {
    5: "rgba(0, 0, 0, 0.05)",
    10: "rgba(0, 0, 0, 0.1)",
    20: "rgba(0, 0, 0, 0.2)",
    30: "rgba(0, 0, 0, 0.3)",
    50: "rgba(0, 0, 0, 0.5)",
  },
  alphaBlack: {
    5: "#0000000d",
    10: "#0000001A",
    20: "#00000033",
    30: "rgba(255, 255, 255, 0.3)",
    50: "#00000080",
  },
};

const spacing = {
  xxsmall: 4,
  xsmall: 8,
  small: 12,
  normal: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 28,
  xxxlarge: 32, // mr kk, aqui eu to inventando moda. Bora conversar dps
  xxxxlarge: 36,
  superlarge: 40,
  megalarge: 44,
  gigalarge: 48,
};
const common = {
  white: "#fff",
  black: "#000",
};
export const darkTheme = {
  colors: {
    common,
    foundation: {
      background: {
        primary: colorPalette.gray[600],
        secondary: colorPalette.gray[550],
        skeleton: colorPalette.gray[550],
        skeletonBone: colorPalette.gray[350],
        alpha30: colorPalette.alphaBlack[30],
        alpha10: colorPalette.alphaBlack[10],
        alpha50: colorPalette.alphaBlack[50],
        alpha20: colorPalette.alphaBlack[20],
        alpha05: colorPalette.alphaBlack[5],
      },
      foreground: {
        primary: colorPalette.gray[0],
        secondary: colorPalette.gray[200],
        tertiary: colorPalette.gray[300],
        quaternary: colorPalette.gray[400],
        quinary: colorPalette.gray[500],
        brand: {
          primary: colorPalette.brand[0],
          secondary: colorPalette.brand[200],
          tertiary: colorPalette.brand[300],
        },
        error: {
          primary: colorPalette.red[0],
          secondary: colorPalette.red[200],
          tertiary: colorPalette.red[300],
        },
        warning: {
          primary: colorPalette.yellow[0],
          secondary: colorPalette.yellow[200],
          tertiary: colorPalette.yellow[300],
        },
        success: {
          primary: colorPalette.green[0],
          secondary: colorPalette.green[200],
          tertiary: colorPalette.green[300],
        },
        message: {
          primary: colorPalette.blue[0],
          secondary: colorPalette.blue[200],
          tertiary: colorPalette.blue[300],
        },
      },
      brand: {
        background: {
          primary: colorPalette.brand[600],
          secondary: colorPalette.brand[500],
        },
        foreground: {
          primary: colorPalette.brand[0],
          secondary: colorPalette.brand[200],
          tertiary: colorPalette.brand[300],
          quaternary: colorPalette.brand[400],
          quinary: colorPalette.brand[500],
        },
      },
      error: {
        background: {
          primary: colorPalette.red[600],
          secondary: colorPalette.red[500],
        },
        foreground: {
          primary: colorPalette.red[0],
          secondary: colorPalette.red[200],
          tertiary: colorPalette.red[300],
          quaternary: colorPalette.red[400],
          quinary: colorPalette.red[500],
        },
      },
      warning: {
        background: {
          primary: colorPalette.yellow[600],
          secondary: colorPalette.yellow[500],
        },
        foreground: {
          primary: colorPalette.yellow[0],
          secondary: colorPalette.yellow[200],
          tertiary: colorPalette.yellow[300],
          quaternary: colorPalette.yellow[400],
          quinary: colorPalette.yellow[500],
        },
      },
      success: {
        background: {
          primary: colorPalette.green[600],
          secondary: colorPalette.green[500],
        },
        foreground: {
          primary: colorPalette.green[0],
          secondary: colorPalette.green[200],
          tertiary: colorPalette.green[300],
          quaternary: colorPalette.green[400],
          quinary: colorPalette.green[500],
        },
      },
      message: {
        background: {
          primary: colorPalette.blue[600],
          secondary: colorPalette.blue[500],
        },
        foreground: {
          primary: colorPalette.blue[0],
          secondary: colorPalette.blue[200],
          tertiary: colorPalette.blue[300],
          quaternary: colorPalette.blue[400],
          quinary: colorPalette.blue[500],
        },
      },
      information: {
        background: {
          primary: colorPalette.blue[600],
          secondary: colorPalette.blue[550],
        },
        foreground: {
          primary: colorPalette.blue[0],
          secondary: colorPalette.blue[200],
          tertiary: colorPalette.blue[300],
          quaternary: colorPalette.blue[400],
          quinary: colorPalette.blue[500],
        },
      },
    },
  },
  spacing,
};

export const lightTheme = {
  colors: {
    common,
    clapListBorder: "#0000001a",
    foundation: {
      background: {
        primary: colorPalette.gray[0],
        secondary: colorPalette.gray[50],
        skeleton: colorPalette.gray[50],
        skeletonBone: colorPalette.gray[50],
        alpha30: colorPalette.alphaWhite[30],
        alpha10: colorPalette.alphaWhite[10],
        alpha50: colorPalette.alphaWhite[50],
        alpha20: colorPalette.alphaWhite[20],
        alpha05: colorPalette.alphaWhite[5],
      },
      foreground: {
        primary: colorPalette.gray[600],
        secondary: colorPalette.gray[400],
        tertiary: colorPalette.gray[300],
        quaternary: colorPalette.gray[200],
        quinary: colorPalette.gray[100],
        brand: {
          primary: colorPalette.brand[600],
          secondary: colorPalette.brand[400],
          tertiary: colorPalette.brand[300],
        },
        error: {
          primary: colorPalette.red[600],
          secondary: colorPalette.red[400],
          tertiary: colorPalette.red[300],
        },
        warning: {
          primary: colorPalette.yellow[600],
          secondary: colorPalette.yellow[400],
          tertiary: colorPalette.yellow[300],
        },
        success: {
          primary: colorPalette.green[600],
          secondary: colorPalette.green[400],
          tertiary: colorPalette.green[300],
        },
        message: {
          primary: colorPalette.blue[600],
          secondary: colorPalette.blue[400],
          tertiary: colorPalette.blue[300],
        },
      },
      brand: {
        background: {
          primary: colorPalette.brand[0],
          secondary: colorPalette.brand[50],
        },
        foreground: {
          primary: colorPalette.brand[600],
          secondary: colorPalette.brand[400],
          tertiary: colorPalette.brand[300],
          quaternary: colorPalette.brand[200],
          quinary: colorPalette.brand[100],
        },
      },
      error: {
        background: {
          primary: colorPalette.red[0],
          secondary: colorPalette.red[50],
        },
        foreground: {
          primary: colorPalette.red[600],
          secondary: colorPalette.red[400],
          tertiary: colorPalette.red[300],
          quaternary: colorPalette.red[200],
          quinary: colorPalette.red[100],
        },
      },
      warning: {
        background: {
          primary: colorPalette.yellow[0],
          secondary: colorPalette.yellow[50],
        },
        foreground: {
          primary: colorPalette.yellow[600],
          secondary: colorPalette.yellow[400],
          tertiary: colorPalette.yellow[300],
          quaternary: colorPalette.yellow[200],
          quinary: colorPalette.yellow[100],
        },
      },
      success: {
        background: {
          primary: colorPalette.green[0],
          secondary: colorPalette.green[50],
        },
        foreground: {
          primary: colorPalette.green[600],
          secondary: colorPalette.green[400],
          tertiary: colorPalette.green[300],
          quaternary: colorPalette.green[200],
          quinary: colorPalette.green[100],
        },
      },
      message: {
        background: {
          primary: colorPalette.blue[0],
          secondary: colorPalette.blue[50],
        },
        foreground: {
          primary: colorPalette.blue[600],
          secondary: colorPalette.blue[400],
          tertiary: colorPalette.blue[300],
          quaternary: colorPalette.blue[200],
          quinary: colorPalette.blue[100],
        },
      },
      information: {
        background: {
          primary: colorPalette.blue[0],
          secondary: colorPalette.blue[50],
        },
        foreground: {
          primary: colorPalette.blue[600],
          secondary: colorPalette.blue[400],
          tertiary: colorPalette.blue[300],
          quaternary: colorPalette.blue[200],
          quinary: colorPalette.blue[100],
        },
      },
    },
  },
  spacing,
};
export type ThemeType = typeof darkTheme;

export default { darkTheme, lightTheme };

/** @type {import("prettier").Config} */
const config = {
  plugins: ["@plasmohq/prettier-plugin-sort-imports"],
  importOrder: [
    "^(react|react-dom)(.*)$",
    "<THIRD_PARTY_MODULES>",
    "^~(.*)$",
    "^@/(.*)$",
    "^[./]"
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true
}

module.exports = config

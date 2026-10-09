declare module 'virtual:migrations' {
  const migrations: { name: string; up: string }[];
  export default migrations;
}

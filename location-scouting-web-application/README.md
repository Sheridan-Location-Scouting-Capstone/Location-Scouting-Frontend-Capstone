## Versions
- Node.Js: v25.0
- NPM: v11.6.2
- Next.Js: 16.0
- TailwindCSS: v4.1

## Running the server

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## References:
- https://nextjs.org/docs
- https://tailwindcss.com/docs

## QoL Features (Future)
### Implement these QoL pages using the docs.
- https://nextjs.org/docs/app/api-reference/file-conventions
### Fully Utilize Light and Dark Mode (currently only developing light)
- using `@media (prefers-color-scheme: light) { }`

## Good Resource for Next.Js backend
- https://nextjs.org/docs/app/guides/authentication#2-validate-form-fields-on-the-server

## React Resources:
- lifecycle (useEffect): https://react.dev/learn/lifecycle-of-reactive-effects
- states (useState): https://react.dev/learn/managing-state

## Optimized Fonts for Next.Js
- https://fonts.google.com/variablefonts?vfquery=roboto

Note: schemas in Next/React.Js are equivalent to DOAs (Data Objects), and they are used as such, so data objects will reside in the schemas directory.

# Project Setup

## Download AI model
- Populate *./keyword-generation/labelled_scenes/* with labels.json
- Populate *./keyword-generation/models/* with model *checkpoint-29550*

## Docker Run Information
- run *Docker Desktop GUI*
- in project :
- `docker-compose up -d`
- `docker build`
- Run container from *Docker GUI*

## Prisma Setup
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx prisma deploy`
- `npm run test:db:push`

# rebuild database (after a pull)
- `npm run migrate:all`

# Running automated tests
- `npx vitest run`

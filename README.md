# pyrite-server-emitter

## Install

- Decorators feature has to be enabled.

```
npm install pyrite-server
npm install pyrite-server-emitter
```

## Example

### main.js

```typescript
import { Server } from "pyrite-server";
import { EmitterPlugin } from "pyrite-server-emitter";

const server = new Server({
  port: 8000,
  routes: "/routes",
  plugins: [new EmitterPlugin()]
});

server.listen(() => {
  console.log("Server running!");
});
```

### /routes folder:
  ### users.js
  
```typescript
import { 
  Route, Get, Post, Put, Delete, Exception, Body, Params, Query
} from "pyrite-server";

import { 
  Emits, Emit, Broadcast
} from "pyrite-server-emitter";


const users = [];
let index = 0;

@Route("/users")
class Users {
  @Get("/")
  getUsers(@Query("name") name) {
    const result = users.filter((user) => !name || user.name === name);
    
    return result;
  }

  @Post("/")
  @Broadcast
  createUser(@Body user, @Emit emit) {
    user.id = index++;

    users.push(user);

    emit(user);
    
    return user;
  }

  @Put("/:id", Number)
  @Broadcast
  updateUser(@Body user, @Emit emit) {
    const foundUser = users.find((localUser) => localUser.id === user.id);
    if (!user) throw Exception(404, "not_found");

    Object.assign(foundUser, user);

    emit(user);

    return user;
  }

  @Delete("/:id", Number)
  @Emits
  removeUser(@Params("id") id, @Emit emit) {
    const indexUser = users.findIndex((user) => user.id === id);
    if (indexUser === -1) throw Exception(404, "not_found");

    users.splice(indexUser, 1);

    emit(id);

    return true;
  }
}
```
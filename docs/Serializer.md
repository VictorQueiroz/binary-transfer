# Serializer

### Generic types

- int (32-bit signed integer, range: -2,147,483,648 through 2,147,483,647)
- bool (8-bit, value should be true or false javascript boolean)
- uint (32-bit unsigned integer, range: 0 through 4,294,967,295)
- long (64-bit signed integer, range: -9,223,372,036,854,775,808 through 9,223,372,036,854,775,807)
- short (16-bit signed integer, range: -32,768 through 32,767)
- float (32-bit single-precision floating-point integer, range: -3.4028235E+38 through -1.401298E-45 † for negative values and 1.401298E-45 through 3.4028235E+38 † for positive values)
- ulong (64-bit unsigned integer, range: 0 through 18,446,744,073,709,551,615 (1.8...E+19 †))
- ushort (16-bit unsigned integer, range: 0 through 65,535)
- string (range: 0 to approximately 2 billion Unicode characters)
- double (64-bit double-precision floating-point integer, range: -1.79769313486231570E+308 through -4.94065645841246544E-324 † for negative values and 4.94065645841246544E-324 through 1.79769313486231570E+308 † for positive values)

### Non-generic types

#### Type

A Type is a term to define the `Container` type. For example:

```
User user -> id: uint, name: string;
```

In the example above we have a constructor named `user`. We can say his type is `User`. A type cannot exist without a `Container`.

Characteristics

- A type can have many constructors
- A type must be linked to at least one constructor
- A type name must start with uppercase in the scheme definition

#### [Vector](https://github.com/VictorQueiroz/binary-transfer/blob/master/docs/Vector.md)

The only non-generic types defined by the library level is a Vector. You can define it using the following syntax on your scheme:

`
Vector<int>
Vector<uint>
Vector<string>
`

You can also use your non-generic types:

`
Vector<User>
Vector<Post>
Vector<Message>
`

You can always point it directly to a constructor:

`
Vector<userFull>
Vector<postDeleted>
Vector<messageEditted>
`

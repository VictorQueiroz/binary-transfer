import fs from 'fs';
import path from 'path';
import { isFunction, forEach, upperFirst, defaults } from 'lodash';

class SchemaBuilder {
    static defaults = {
        binaryTransferPath: 'binary-transfer'
    };

    constructor(options) {
        defaults(options, SchemaBuilder.defaults);
        this.files = [];
        this.schemas = options.schemas;
        this.generics = {
            int: 'Int',
            long: 'Long',
            uint: 'UInt',
            ulong: 'ULong',
            float: 'Float',
            bytes: 'Bytes',
            string: 'String',
            double: 'Double'
        };
        this.binaryTransferPath = options.binaryTransferPath;
    }

    getConstructorName(name) {
        return upperFirst(this.getRealTypeOrConstructorName(name));
    }

    isTypeReference(name) {
        if(name.indexOf('.') > -1) {
            name = this.getRealTypeOrConstructorName(name);
        }
        return name.charAt(0).toUpperCase() == name.charAt(0);
    }

    isConstructorReference(name) {
        if(name.indexOf('.') > -1) {
            name = this.getRealTypeOrConstructorName(name);
        }
        return name.charAt(0).toLowerCase() == name.charAt(0);
    }

    getRealTypeOrConstructorName(name) {
        const dotIndex = name.indexOf('.');

        if(dotIndex > -1) {
            return this.getRealTypeOrConstructorName(name.substring(dotIndex + 1));
        }

        return name;
    }

    createTypeFile(typeName, constructors) {
        const fullPath = typeName.split('.');
        fullPath.splice(1, 0, 'types/');

        const context = {
            possibleIds: [],
            constructorName: upperFirst(this.getRealTypeOrConstructorName(typeName)) + 'Type',
            binaryTransferPath: this.getBinaryTransferPath()
        };

        constructors.forEach(ctor => {
            if(ctor.type != typeName) {
                return false;
            }

            context.possibleIds.push(ctor.id);
        });


        const file = {
            filePath: path.join(...fullPath, context.constructorName + '.js'),
            template: fs.readFileSync(path.resolve(__dirname, 'templates/type.template')),
            data: context
        };

        this.files.push(file);

        return file;
    }

    isGenericType(type) {
        return this.generics.hasOwnProperty(type);
    }

    isVectorType(type) {
        return type.substring(0, 6) == 'Vector';
    }

    createParams(params) {
        return params.map(param => {
            if(this.isVectorType(param.type)) {
                return {
                    key: param.name,
                    type: param.type.substring(7, param.type.length - 1),
                    vector: true
                };
            }

            if(this.isGenericType(param.type)) {
                return {
                    key: param.name,
                    method: this.generics[param.type],
                    generic: true,
                };
            }

            if(this.isTypeReference(param.type)) {
                return {
                    key: param.name,
                    type: param.type,
                    typeReference: true,
                };
            }

            if(this.isConstructorReference(param.type)) {
                return {
                    key: param.name,
                    type: param.type,
                    constructorReference: true
                };
            }
        });
    }

    getBinaryTransferPath() {
        return (
            isFunction(this.binaryTransferPath) ?
            this.binaryTransferPath(__dirname) :
            this.binaryTransferPath
        );
    }

    createConstructor({ ctor, constructors }) {
        const typeFile = this.createTypeFile(ctor.type, constructors);
        const fullPath = ctor.constructor.split('.');
        const ctorName = fullPath[fullPath.length - 1];
        const constructorName = this.getConstructorName(ctorName);
        const binaryTransferPath = this.getBinaryTransferPath();

        const prefixedName = ctor.constructor.split('.');
        const namespacedName = prefixedName.slice(1);

        namespacedName.splice(namespacedName.length - 1, 1, constructorName);

        fullPath.splice(1, 0, 'constructors');

        const rootPath = fullPath.map(_ => '..');
        const file = {
            filePath: path.join(...fullPath, constructorName + '.js'),
            template: fs.readFileSync(path.resolve(__dirname, 'templates/constructor.template')),
            data: {
                id: ctor.id,
                ctor: namespacedName.join('.'),
                params: this.createParams(ctor.params),
                rootPath: rootPath.join('/'),
                ctorType: ctor.type,
                properties: ctor.params.map(param => param.name),
                prefixedCtor: prefixedName.join('.'),
                typeFileData: {
                    ...typeFile,
                    filePath: path.join(...rootPath, typeFile.filePath),
                },
                typeStorePath: path.join(...rootPath) + '/ConstructorStore.js',
                constructorName: constructorName,
                binaryTransferPath: binaryTransferPath
            }
        };

        this.files.push(file);
        return file;
    }

    createSchema(schema) {
        forEach(schema.constructors, (constructors, type) => {
            constructors = constructors.map(ctor => {
                return {
                    ...ctor,
                    type: `${schema.prefix}.${ctor.type}`,
                    constructor: `${schema.prefix}.${ctor.constructor}`,
                    params: ctor.params.map(param => {
                        if(this.isGenericType(param.type) || this.isVectorType(param.type) || !schema.prefix) {
                            return {...param};
                        }

                        return {
                            ...param,
                            type: `${schema.prefix}.${param.type}`
                        };
                    })
                };
            });

            const ctorFiles = constructors.map((ctor) => {
                return this.createConstructor({
                    ctor,
                    constructors: constructors
                });
            });

            this.files.push({
                filePath: path.join(schema.prefix, 'index.js'),
                template: fs.readFileSync(path.resolve(__dirname, 'templates/schema_index.template')),
                data: {
                    types: ctorFiles.map(file => {
                        return {
                            ctor: file.data.ctor,
                            filePath: path.join('..', file.filePath)
                        };
                    })
                }
            });
        });
    }

    build() {
        this.schemas.forEach(schema => {
            this.createSchema(schema);
        });

        this.files.push({
            filePath: './ConstructorStore.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/constructor_store.template')),
            data: {}
        });

        this.files.push({
            filePath: './index.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/root_index.template')),
            data: {
                schemas: this.schemas.map(schema => schema.prefix)
            }
        });

        this.files.push({
            filePath: './Vector.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/vector.template')),
            data: {
                generics: this.generics,
                lodashMethods: [
                    'get', 'first', 'last', 'tail',
                    'head'
                ],
                nativeArrayMethods: [
                    'forEach', 'shift', 'pop', 'push'
                ],
                binaryTransferPath: this.getBinaryTransferPath()
            }
        });

        return this.files;
    }
}

export default SchemaBuilder;

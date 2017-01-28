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
        const typeData = {
            possibleIds: [],
            constructorName: upperFirst(this.getRealTypeOrConstructorName(typeName)) + 'Type'
        };

        constructors.forEach(ctor => {
            if(ctor.type != typeName) {
                return false;
            }

            typeData.possibleIds.push(ctor.id);
        });

        fullPath.splice(1, 0, 'types/');

        const file = {
            filePath: path.join(...fullPath, typeData.constructorName + '.js'),
            template: fs.readFileSync(path.resolve(__dirname, 'templates/type.template')),
            data: typeData
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
                    type: param.type.slice(6, param.type.length - 1),
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

    createConstructor({ ctor, constructors }) {
        const typeFile = this.createTypeFile(ctor.type, constructors);
        const fullPath = ctor.constructor.split('.');
        const ctorName = fullPath[fullPath.length - 1];
        const constructorName = this.getConstructorName(ctorName);
        const binaryTransferPath = isFunction(this.binaryTransferPath) ?
                                    this.binaryTransferPath(__dirname) :
                                    this.binaryTransferPath;


        const prefixedName = ctor.constructor.split('.');
        const namespacedName = prefixedName.slice(1);

        namespacedName.splice(namespacedName.length - 1, 1, constructorName);

        fullPath.splice(1, 0, 'constructors');
        const file = {
            filePath: path.join(...fullPath, constructorName + '.js'),
            template: fs.readFileSync(path.resolve(__dirname, 'templates/constructor.template')),
            data: {
                id: ctor.id,
                ctor: namespacedName.join('.'),
                params: this.createParams(ctor.params),
                prefixedCtor: prefixedName.join('.'),
                typeFileData: {
                    ...typeFile,
                    filePath: path.join(...fullPath.map(_ => '..'), typeFile.filePath),
                },
                typeStorePath: path.join(...fullPath.map(_ => '../')) + '/TypeStore.js',
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
                template: fs.readFileSync(path.resolve(__dirname, 'templates/schemaTypes.template')),
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
            filePath: './TypeStore.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/typeStore.template')),
            data: {}
        });

        this.files.push({
            filePath: './index.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/indexSchema.template')),
            data: {
                schemas: this.schemas.map(schema => schema.prefix)
            }
        });

        return this.files;
    }
}

export default SchemaBuilder;

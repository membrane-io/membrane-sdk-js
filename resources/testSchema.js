export default {
  imports: [{
    id: "00000000-0000-1000-8000-000000000000",
    name: "test",
    types: [
      {
        name: 'Root',
        fields: [],
        computedFields: [],
        actions: [],
        events: [],
      },
      {
        name: "ThingCollection_at_params",
        fields: [
          { name: 'field', type: 'Int' }
        ],
      },
      {
        name: "ThingCollection",
        actions: [],
        computedFields: [
          {
            name: "at",
            params: [{
              name: "index",
              type: "Int"
            }],
            type: "Thing"
          },
          {
            name: "many",
            ofType: {
              type: "Thing"
            },
            type: "List"
          },
          {
            name: "lists",
            ofType: {
              type: "List",
              ofType: "Thing",
            },
            type: "List"
          },
          {
            name: "count",
            type: "Int"
          }
        ],
        events: [],
        fields: [],
      },
      {
        name: "Thing",
        actions: [{
          name: "doSomething",
          params: [{
            name: "text",
            type: "String"
          }],
          type: "Int"
        }],
        computedFields: [{
          name: "computed",
          type: "String",
          params: [{
            name: "thing",
            type: "Ref",
            ofType: "Thing"
          }],
        }],
        description: "A simple thing",
        events: [{
          name: "somethingHappened",
          type: "SomethingHappenedEvent"
        }],
        fields: [
          { name: "field", type: "String" },
          { name: "int", type: "Int" },
          { name: "float", type: "Float" },
          { name: "bool", type: "Boolean" },
          { name: "related", type: "ThingCollection" },
          { name: "stringRef", type: "Ref", ofType: "String" },
          {
            name: "otherImport",
            type: "00000000-0000-1000-8000-000000000001:Root"
          },
        ]
      },
      {
        name: "SomethingHappenedEvent",
        actions: [],
        computedFields: [],
        events: [],
        fields: [{
          name: "text",
          type: "String"
        },
          {
            name: "thing",
            type: "Thing"
          }
        ],
      }
    ]
  },
    {
      name: "test2",
      id: "00000000-0000-1000-8000-000000000001",
      types: [
        {
          name: "Root",
          fields: [
            {
              name: 'self',
              type: 'Ref',
              ofType: 'Root',
            }
          ],
          computedFields: [],
          actions: [],
          events: [],
        }
      ]
    }
  ],
  types: [
    {
      name: "Root",
      actions: [
        {
          name: "anAction",
          params: [{
            name: "value",
            type: "String",
          }],
          type: 'Void',
        }
      ],
      computedFields: [
        {
          name: "computedField",
          type: "String"
        },
        {
          name: "scalarComputedWithParams",
          type: "String",
          params: [
            {
              name: "refParam",
              type: "Ref",
              ofType: "OwnThing",
            },
            {
              name: "strParam",
              type: "String",
            }
          ],
        },
        {
          name: "nonScalarComputedWithParams",
          type: "OwnThing",
          params: [
            {
              name: "refParam",
              type: "Ref",
              ofType: "OwnThing",
            },
            {
              name: "strParam",
              type: "String",
            }
          ],
        }
      ],
      events: [
        {
          name: "anEvent",
          params: [{
            name: "value",
            type: "String",
          }],
        },
      ],
      fields: [
        {
          name: "thing",
          type: "00000000-0000-1000-8000-000000000000:ThingCollection"
        },
        {
          name: "ownThing",
          type: "OwnThing"
        },
      ],
    },
    {
      name: "OwnThing",
      actions: [],
      computedFields: [
        { name: "ownThingRef", type: "Ref", ofType: "OwnThing" },
        { name: "strList", type: "List", ofType: "String" },
        { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
        { name: "thingRef", type: "Ref", ofType: "00000000-0000-1000-8000-000000000000:Thing" },
        { name: "voidRef", type: "Ref", ofType: "Void" },
      ],
      events: [],
      fields: [
        { name: "field", type: "String" },
        { name: "fieldRef", type: "Ref", ofType: { type: "String" } },
        { name: "fields", type: "List", ofType: "String" },
        { name: "int", type: "Int" },
        { name: "float", type: "Float" },
        { name: "bool", type: "Boolean" },
        { name: "ownThingRef", type: "Ref", ofType: "OwnThing" },
        { name: "strList", type: "List", ofType: "String" },
        { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
        { name: "thingRef", type: "Ref", ofType: "00000000-0000-1000-8000-000000000000:Thing" },
        { name: "voidRef", type: "Ref", ofType: "Void" },
        { name: "void", type: "Void" },
      ],
    }
  ]
};

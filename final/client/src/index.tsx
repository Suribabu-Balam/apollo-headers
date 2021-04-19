import React from 'react';
import ReactDOM from 'react-dom';
import {
  ApolloClient,
  gql,
  ApolloLink,
  from,
  ApolloProvider,
  useQuery,
  NormalizedCacheObject,
  HttpLink,
} from '@apollo/client';

import { onError } from 'apollo-link-error';
import Pages from './pages';
import Login from './pages/login';
import injectStyles from './styles';
import { cache } from './cache';

export const typeDefs = gql`
  extend type Query {
    isLoggedIn: Boolean!
    cartItems: [ID!]!
  }
`;
const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' });

// Setup the header for the request
const middlewareAuthLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('AUTH_TOKEN');

  const authorizationHeader = token ? `Bearer ${token}` : null;
  operation.setContext({
    headers: {
      authorization: authorizationHeader,
    },
  });
  return forward(operation);
});

const errorLink = onError((err) => {
  console.log(err, 'erorrr...........');
});

//After the backend responds, we take the refreshToken from headers if it exists, and save it in the cookie.
const afterwareLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((response) => {
    const context = operation.getContext();
    const authHeader = context.response.headers;
    if (authHeader) {
      console.log(authHeader, 'authHeader');

      const refreshToken = authHeader.get('refreshToken');
      if (refreshToken) {
        localStorage.setItem('AUTH_TOKEN', refreshToken);
      }
    }

    return response;
  });
});

// Set up our apollo-client to point at the server we created
// this can be local or a remote endpoint
const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  cache,
  link: from([middlewareAuthLink, afterwareLink, httpLink]),
  uri: 'http://localhost:4000/graphql',
  headers: {
    authorization: localStorage.getItem('token') || '',
    'client-name': 'Space Explorer [web]',
    'client-version': '1.0.0',
  },
  typeDefs,
  resolvers: {},
});

/**
 * Render our app
 * - We wrap the whole app with ApolloProvider, so any component in the app can
 *    make GraphqL requests. Our provider needs the client we created above,
 *    so we pass it as a prop
 * - We need a router, so we can navigate the app. We're using Reach router for this.
 *    The router chooses between which component to render, depending on the url path.
 *    ex: localhost:3000/login will render only the `Login` component
 */

const IS_LOGGED_IN = gql`
  query IsUserLoggedIn {
    isLoggedIn @client
  }
`;

function IsLoggedIn() {
  const { data } = useQuery(IS_LOGGED_IN);
  return data.isLoggedIn ? <Pages /> : <Login />;
}

injectStyles();
ReactDOM.render(
  <ApolloProvider client={client}>
    <IsLoggedIn />
  </ApolloProvider>,
  document.getElementById('root'),
);

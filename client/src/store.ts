import { configureStore, createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api, clearToken, setToken } from "./api/client";
import type { Cart, Product, User } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
}

interface CatalogState {
  products: Product[];
  loading: boolean;
}

interface CartState {
  cart: Cart;
}

export const login = createAsyncThunk("auth/login", async (payload: { email: string; password: string }) =>
  api<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify(payload) })
);

export const register = createAsyncThunk(
  "auth/register",
  async (payload: { email: string; password: string; nombre: string; apellido: string }) =>
    api<{ message: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify(payload) })
);

export const fetchMe = createAsyncThunk("auth/me", async () =>
  api<{ user: User }>("/auth/me")
);

export const fetchProducts = createAsyncThunk<{ products: Product[] }, string | undefined>("catalog/fetch", async (query = "") =>
  api<{ products: Product[] }>(`/products${query}`)
);

export const fetchCart = createAsyncThunk("cart/fetch", async () => api<{ cart: Cart }>("/cart"));

export const addToCart = createAsyncThunk("cart/add", async (payload: { productoId: number; cantidad: number }) =>
  api<{ cart: Cart }>("/cart/items", { method: "POST", body: JSON.stringify(payload) })
);

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, token: localStorage.getItem("degustan_token") } as AuthState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      clearToken();
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(login.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      setToken(action.payload.token);
    });
    builder.addCase(fetchMe.fulfilled, (state, action) => {
      state.user = action.payload.user;
    });
    builder.addCase(fetchMe.rejected, (state) => {
      state.user = null;
      state.token = null;
      clearToken();
    });
  }
});

const catalogSlice = createSlice({
  name: "catalog",
  initialState: { products: [], loading: false } as CatalogState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchProducts.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      state.products = action.payload.products;
      state.loading = false;
    });
  }
});

const cartSlice = createSlice({
  name: "cart",
  initialState: { cart: { items: [], total: 0 } } as CartState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      state.cart = action.payload.cart;
    });
    builder.addCase(addToCart.fulfilled, (state, action) => {
      state.cart = action.payload.cart;
    });
  }
});

export const { logout, setUser } = authSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    catalog: catalogSlice.reducer,
    cart: cartSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

<script setup>

// IMPORTS
import './auth-panel.scss';
import { computed, reactive, watch } from 'vue';

// SETUP PROPS
const props = defineProps({
  mode: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  signInEmail: {
    type: String,
    default: '',
  },
  verificationEmail: {
    type: String,
    default: '',
  },
});

// SETUP EVENTS
const emit = defineEmits(['sign-in', 'sign-up', 'verify', 'switch-mode']);

// SETUP STATE
const signInForm = reactive({
  email: props.signInEmail,
  password: '',
});
const signUpForm = reactive({
  username: '',
  email: props.signInEmail,
  password: '',
});
const verifyForm = reactive({
  code: '',
});

// WATCH: SIGN-IN EMAIL
watch(() => props.signInEmail, (email) => {
  signInForm.email = email || '';

  // PREFILL SIGN-UP EMAIL WHEN EMPTY
  if (!signUpForm.email) {
    signUpForm.email = email || '';
  }
});

// WATCH: MODE
watch(() => props.mode, (mode) => {

  // GET MODE FOR SIGN-IN
  if (mode === 'sign-in') {
    signInForm.password = '';
  }

  // GET MODE FOR SIGN-UP
  if (mode === 'sign-up') {
    signUpForm.password = '';
  }

  // GET MODE FOR VERIFY
  if (mode === 'verify') {
    verifyForm.code = '';
  }
});

// COMPUTED: PANEL COPY
const panelCopy = computed(() => {

  // CHECK FOR SIGN-UP PROPS
  if (props.mode === 'sign-up') {

    // RETURN
    return {
      title: 'Create your account',
      subtitle: 'Sign up with a username, your e-mail address, and a secure password.',
    };
  }

  // CHECK FOR VERIFY PROPS
  if (props.mode === 'verify') {

    // RETURN
    return {
      title: 'Enter your code',
      subtitle: `We sent a 6-digit verification code to ${ props.verificationEmail || 'your e-mail address' }.`,
    };
  }

  // RETURN
  return {
    title: 'Sign in to kanbun',
    subtitle: 'Use your e-mail address and password, then confirm the 6-digit code from your inbox.',
  };
});

// HANDLER: SUBMIT SIGN IN
const submitSignIn = () => {

  // EMIT SIGN IN
  emit('sign-in', {
    email: signInForm.email.trim(),
    password: signInForm.password,
  });
};

// HANDLER: SUBMIT SIGN UP
const submitSignUp = () => {

  // EMIT SIGN-UP
  emit('sign-up', {
    username: signUpForm.username.trim(),
    email: signUpForm.email.trim(),
    password: signUpForm.password,
  });
};

// HANDLER: SUBMIT VERIFY
const submitVerify = () => {

  // EMIT VERIFY
  emit('verify', {
    code: verifyForm.code.trim(),
  });
};
</script>

<template>
  <section class="auth-panel">
    <div class="auth-panel__card">
      <div class="auth-panel__copy">
        <p class="auth-panel__eyebrow">Secure access</p>
        <h1 class="auth-panel__title">{{ panelCopy.title }}</h1>
        <p class="auth-panel__subtitle">{{ panelCopy.subtitle }}</p>
      </div>
      <div v-if="mode !== 'verify'" class="auth-panel__tabs">
        <button class="auth-panel__tab" :class="{ 'auth-panel__tab--active': mode === 'sign-in' }" type="button" @click="emit('switch-mode', 'sign-in')">
          Sign in
        </button>
        <button class="auth-panel__tab" :class="{ 'auth-panel__tab--active': mode === 'sign-up' }" type="button" @click="emit('switch-mode', 'sign-up')">
          Sign up
        </button>
      </div>
      <form v-if="mode === 'sign-in'" class="auth-panel__form" @submit.prevent="submitSignIn">
        <label class="auth-panel__field">
          <span class="auth-panel__label">E-mail address</span>
          <input v-model="signInForm.email" class="auth-panel__input" type="email" autocomplete="email" placeholder="you@example.com" :disabled="loading" />
        </label>
        <label class="auth-panel__field">
          <span class="auth-panel__label">Password</span>
          <input v-model="signInForm.password" class="auth-panel__input" type="password" autocomplete="current-password" placeholder="Your password" :disabled="loading" />
        </label>
        <button class="auth-panel__submit" type="submit" :disabled="loading">
          {{ loading ? 'Sending code...' : 'Continue' }}
        </button>
      </form>
      <form v-else-if="mode === 'sign-up'" class="auth-panel__form" @submit.prevent="submitSignUp">
        <label class="auth-panel__field">
          <span class="auth-panel__label">Username</span>
          <input v-model="signUpForm.username" class="auth-panel__input" type="text" autocomplete="username" placeholder="Your username" :disabled="loading" />
        </label>
        <label class="auth-panel__field">
          <span class="auth-panel__label">E-mail address</span>
          <input v-model="signUpForm.email" class="auth-panel__input" type="email" autocomplete="email" placeholder="you@example.com" :disabled="loading" />
        </label>
        <label class="auth-panel__field">
          <span class="auth-panel__label">Password</span>
          <input v-model="signUpForm.password" class="auth-panel__input" type="password" autocomplete="new-password" placeholder="At least 8 characters" :disabled="loading" />
        </label>
        <button class="auth-panel__submit" type="submit" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>
      </form>
      <form v-else class="auth-panel__form" @submit.prevent="submitVerify">
        <label class="auth-panel__field">
          <span class="auth-panel__label">Verification code</span>
          <input v-model="verifyForm.code" class="auth-panel__input auth-panel__input--code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" :disabled="loading" />
        </label>
        <div class="auth-panel__actions">
          <button class="auth-panel__back" type="button" :disabled="loading" @click="emit('switch-mode', 'sign-in')">
            Back
          </button>
          <button class="auth-panel__submit" type="submit" :disabled="loading">
            {{ loading ? 'Verifying...' : 'Verify code' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

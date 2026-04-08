import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	fontFamily: {
  		sans: [
  			'Ploni',
  			'sans-serif'
  		],
  		display: [
  			'Ploni',
  			'sans-serif'
  		],
  		serif: [
  			'Kedem',
  			'Frank Ruhl Libre"',
  			'serif'
  		],
  		heading: [
  			'Kedem',
  			'Frank Ruhl Libre"',
  			'serif'
  		],
  		antidot: [
  			'OS Antidot TR"',
  			'Ploni',
  			'sans-serif'
  		],
  		kedem: [
  			'Kedem',
  			'Frank Ruhl Libre"',
  			'serif'
  		],
  		ploni: [
  			'Ploni',
  			'sans-serif'
  		]
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			gold: {
  				DEFAULT: 'hsl(var(--gold))',
  				light: 'hsl(var(--gold-light))'
  			},
  			teal: 'hsl(var(--teal))',
  			sage: 'hsl(var(--sage))',
  			cream: {
  				DEFAULT: 'hsl(var(--cream))',
  				warm: 'hsl(var(--cream-warm))'
  			},
  			mahogany: 'hsl(var(--mahogany))',
  			navy: {
  				DEFAULT: 'hsl(var(--navy-deep))',
  				deep: 'hsl(var(--navy-deep))',
  				light: 'hsl(var(--navy-light))'
  			},
  			crimson: {
  				DEFAULT: 'hsl(var(--crimson))',
  				dark: 'hsl(var(--crimson-dark))',
  				light: 'hsl(var(--crimson-light))'
  			},
  			brown: {
  				DEFAULT: 'hsl(var(--brown))',
  				light: 'hsl(var(--brown-light))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-8px)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '0.4'
  				},
  				'50%': {
  					opacity: '0.8'
  				}
  			},
  			shimmer: {
  				from: {
  					backgroundPosition: '200% 0'
  				},
  				to: {
  					backgroundPosition: '-200% 0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.5s ease-out forwards',
  			'fade-up': 'fade-up 0.6s ease-out',
  			float: 'float 4s ease-in-out infinite',
  			'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
  			shimmer: 'shimmer 3s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

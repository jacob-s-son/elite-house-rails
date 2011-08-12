EliteHouse::Application.routes.draw do
 scope '(:locale)', :locale => /lv|ru/ do
   resources :categories, :only => [ :index ] do
     get 'contacts', :on => :collection
     get 'building', :on => :collection
     get 'sitemap',  :on => :collection
     resources :sub_categories, :only => [ :index ]
   end
   
   resources :sub_categories, :only => [ :index ] do
     resources :furniture, :only => [ :index, :show ]
   end
   
   resources :categories, :only => [ :index ] do
     resources :furniture, :only => [ :index, :show ]
   end
   
   namespace :admin do
     resources :categories, :sub_categories, :furniture#, :only => [ :new, :update, :destroy, :edit, :create ]
     match '/' => "base#admin_actions"
   end
   
   match '/sitemap(.:format)' => 'categories#sitemap'
   match '/:locale' => 'categories#index'
   match '/', :to => redirect('/lv/categories')
   root :to => 'categories#index'
 end
end

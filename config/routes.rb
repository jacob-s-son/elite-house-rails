EliteHouse::Application.routes.draw do
 scope '(:locale)', :locale => /lv|ru/ do
   resources :categories, :only => [ :index ] do
     resources :sub_categories, :only => [ :index ]
   end
   
   resources :sub_categories, :only => [ :index ] do
     resources :furniture, :only => [ :index, :show ]
   end
   
   namespace :admin do
     resources :categories, :sub_categories, :furniture#, :only => [ :new, :update, :destroy, :edit, :create ]
   end
   
   root :to => 'categories#index'
 end
end
